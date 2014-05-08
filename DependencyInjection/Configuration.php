<?php

namespace Ibrows\SmartAjaxBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

/**
 * This is the class that validates and merges configuration from your app/config files
 *
 * To learn more see {@link http://symfony.com/doc/current/cookbook/bundles/extension.html#cookbook-bundles-extension-config-class}
 */
class Configuration implements ConfigurationInterface
{
    /**
     * {@inheritDoc}
     */
    public function getConfigTreeBuilder()
    {

        $treeBuilder = new TreeBuilder();

        $rootNode = $treeBuilder->root('ibrows_smartajax');

        $rootNode
            ->children()
                ->booleanNode('redirect_listener_enabled')->defaultTrue()->end()
                ->integerNode('redirect_listener_code')->defaultValue(205)->min(200)->max(299)->end()
                ->scalarNode('redirect_listener_header')->defaultValue('Redirect-Location')->end()
            ->end()
        ;

        return $treeBuilder;
    }
}
